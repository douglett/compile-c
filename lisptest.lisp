(set $test 0)
(set $testy 10)

(defun @func 
	($a $b) 
	(
		(set $testy 
			(* 1000 
				(+ 4 4)))
		(set $test 
			(* 11 2))
		(if 
			(== $a 1)
			(set $b 2))
		(while 
			(> a 1)
			(call @puti $a)
			(set $a 
				(- a 1)))
		(return 
			(* $a $b))))

(defun @main
	()
	(
		(call @func 
			(1 
				(+ 2 
					(* 1 3))))
		(call @puti 
			(10))
		(return 
			(+ 120 
				(* 
					(call @func 
						(2 2))
					2)))))
